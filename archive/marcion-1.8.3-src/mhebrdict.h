#ifndef MHEBRDICT_H
#define MHEBRDICT_H

#include <QWidget>

#include "booktextbrowser.h"

#define M_WLC_ACC 1700
#define M_WLC_VOW 1750
#define M_WLC_CONS 1800
#define M_WLC_MORPH 1850

namespace Ui {
class MHebrDict;
}

class MConcItem : public QTreeWidgetItem
{
public:
    MConcItem():QTreeWidgetItem(0),_count(1){}
    ~MConcItem(){}
    int _book,_chapter,_verse,_count;
};

class MHebrDict : public QWidget
{
    Q_OBJECT

public:
    explicit MHebrDict(QWidget *parent = 0);
    ~MHebrDict();

    void queryHebWord(QString const & word);
    void analyseVerse(int book, int chapter, int verse, int verse_max);

    static bool isWLC(int bnum);
    static QString prepareWLC(const QString &text);
private slots:
    void on_btStart_clicked();
    void slot_outputAnchorClicked ( const QUrl & link );
    void on_trwConc_itemActivated(QTreeWidgetItem *item, int );
    void on_cmbItems_activated(int index);
    void on_tbPrevVerse_clicked();
    void on_tbNextVerse_clicked();
    void on_tbFontPlus_clicked();
    void on_tbFontMinus_clicked();
    void on_cmbAcc_currentIndexChanged(int index);
    void on_trwConc_customContextMenuRequested(const QPoint &);
    void on_tbActionConc_clicked(bool checked);
    void on_tbFontConcPlus_clicked();
    void on_tbFontConcMinus_clicked();
    void on_tbConcHide_clicked();
    void on_tbVerseClose_clicked();

private:
    Ui::MHebrDict *ui;

    static unsigned int count;
    static QStringList bnames;
    static QString _template;

    QStringList _content,_content_title;
    QString _inpText;
    int _book,_chapter,_verse;

    MButtonMenu popup;
    QAction *a_show,*a_analyse;

    void fillContent(bool show_first, bool header);
    void showVerse(int book, int chapter, int verse);
    void queryConcordance(int book, int chapter, int verse);
    QString limit() const;

    void query(QString const & word);
    void queryFulltext(QString const & word);
    void queryNumber(int num);
};

#endif // MHEBRDICT_H
