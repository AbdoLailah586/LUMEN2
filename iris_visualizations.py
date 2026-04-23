import pandas as pd
import matplotlib.pyplot as plt
from sklearn.datasets import load_iris

# --- SETUP ---
print("Loading dataset...")
iris_raw = load_iris()
df = pd.DataFrame(iris_raw.data, columns=['sepal_length', 'sepal_width', 'petal_length', 'petal_width'])
df['species'] = iris_raw.target_names[iris_raw.target]

# --- Q1 HISTOGRAM ---
print("\n[Q1] Displaying Histogram... (Close the plot window to proceed to the next one)")
mean_petal_len = df['petal_length'].mean()
median_petal_len = df['petal_length'].median()

plt.figure(figsize=(8, 5))
plt.hist(df['petal_length'], bins=20)
plt.axvline(mean_petal_len, color='red', label=f'Mean: {mean_petal_len:.2f}')
plt.axvline(median_petal_len, color='green', linestyle='--', label=f'Median: {median_petal_len:.2f}')

plt.title('Histogram of Petal Length')
plt.xlabel('Petal Length')
plt.ylabel('Frequency')
plt.legend()
plt.tight_layout()
plt.show()

# --- Q2 BOXPLOT ---
print("\n[Q2] Displaying Boxplot... (Close the plot window to proceed to the next one)")
setosa_petal = df[df['species'] == 'setosa']['petal_length']
versicolor_petal = df[df['species'] == 'versicolor']['petal_length']
virginica_petal = df[df['species'] == 'virginica']['petal_length']

data_grouped = [setosa_petal, versicolor_petal, virginica_petal]
names = ['setosa', 'versicolor', 'virginica']

plt.figure(figsize=(8, 5))
plt.boxplot(data_grouped, labels=names, medianprops={'color': 'red'})

plt.title('Distribution of Petal Length by Species')
plt.xlabel('Species')
plt.ylabel('Petal Length')
plt.tight_layout()
plt.show()

# --- Q3 SCATTER PLOT ---
print("\n[Q3] Displaying Scatter Plot... (Close the plot window to proceed to the next one)")
plt.figure(figsize=(8, 5))
colors = {'setosa': 'red', 'versicolor': 'green', 'virginica': 'blue'}

for species, group in df.groupby('species'):
    plt.scatter(group['petal_length'], group['petal_width'], 
                color=colors[species], label=species)

plt.title('Petal Length vs. Petal Width')
plt.xlabel('Petal Length')
plt.ylabel('Petal Width')
plt.legend()
plt.tight_layout()
plt.show()

# --- Q4 BONUS ---
print("\n[Q4] Displaying Bonus Sepal Length Histogram...")
mean_sepal_len = df['sepal_length'].mean()
median_sepal_len = df['sepal_length'].median()

plt.figure(figsize=(8, 5))
plt.hist(df['sepal_length'], bins=15)
plt.axvline(mean_sepal_len, color='red', label=f'Mean: {mean_sepal_len:.2f}')
plt.axvline(median_sepal_len, color='green', linestyle='--', label=f'Median: {median_sepal_len:.2f}')

plt.title('Histogram of Sepal Length')
plt.xlabel('Sepal Length')
plt.ylabel('Frequency')
plt.legend()
plt.tight_layout()
plt.show()
